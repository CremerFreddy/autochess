using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

public class cashManager : MonoBehaviour
{
    public main mainStats;
    public Text cashText;
    // Start is called before the first frame update
    void Start()
    {
        mainStats = gameObject.GetComponent<main>();
    }

    // Update is called once per frame
    void Update()
    {
        cashText.text = "Gold: " + mainStats.cash;
    }
}
