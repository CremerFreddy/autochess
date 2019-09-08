using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class controlsManager : MonoBehaviour
{
    public bool cardSelected;
    public schachbrett brett;
    public Camera cam;
    public schachfeld selectedfield;
    public GameObject myPrefab;
    public GameObject myEnemiePrefab;
    // Start is called before the first frame update
    void Start()
    {
        cardSelected = false;
    }

    // Update is called once per frame
    void Update()
    {
        if(cardSelected)
        {
            RaycastHit hit;
            Ray ray = cam.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out hit))
            {
                if(hit.collider.tag == "chessfield")
                {
                    if (hit.collider.GetComponent<schachfeld>().Equals(selectedfield))
                    {

                    }
                    else
                    {
                        if(selectedfield != null)
                        {
                            selectedfield.selected = false;
                        }
                        
                        selectedfield = hit.collider.GetComponent<schachfeld>();
                        selectedfield.selected = true;
                    }
                    
                }
                

                // Do something with the object that was hit by the raycast.
            }
           /* if (Input.GetMouseButtonUp(0))
            {
                    if (selectedfield.locked == false)
                    {
                        selectedfield.locked = true;
                        GameObject obj = Instantiate(myPrefab, new Vector3(selectedfield.x, 1, selectedfield.y), Quaternion.identity);
                        AI objAI = obj.GetComponent<AI>();
                        objAI.feld = selectedfield;
                        objAI.feld.onField = objAI;
                        obj.GetComponent<AI>().enemielist = gameObject.GetComponent<enemies>();
                        obj.GetComponent<AI>().teamlist = gameObject.GetComponent<team>();
                        obj.GetComponent<AI>().phase = gameObject.GetComponent<main>();
                    }

               
            }

            if (Input.GetMouseButtonUp(1))
            {


                    int pos1 = (int)hit.collider.transform.position.x;//(int)Math.Round(hit.point.x, 0);
                    int pos2 = (int)hit.collider.transform.position.z;//Math.Round(hit.point.z, 0);
                    if (brett.brettArray[pos1, pos2].locked == false)
                    {
                        brett.brettArray[pos1, pos2].locked = true;
                        GameObject obj = Instantiate(myEnemiePrefab, new Vector3(pos1, 1, pos2), Quaternion.identity);
                        AI objAI = obj.GetComponent<AI>();
                        objAI.feld = brett.brettArray[pos1, pos2];
                        objAI.feld.onField = objAI;
                        obj.GetComponent<AI>().enemielist = gameObject.GetComponent<enemies>();
                        obj.GetComponent<AI>().teamlist = gameObject.GetComponent<team>();
                        obj.GetComponent<AI>().phase = gameObject.GetComponent<main>();
                    }
                
            }
            */
        }
        
    }
}
